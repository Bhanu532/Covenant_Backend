import { IProfile } from "../models/Profile";

export interface MatchResult {
  profile: IProfile;
  matchScore: number;
  breakdown: {
    ageScore: number;
    locationScore: number;
    denominationScore: number;
    christianScore: number;
    educationScore: number;
    careerMinistryScore: number;
  };
}

function calculateAge(dobString: string | null | undefined): number | null {
  if (!dobString) return null;
  const birthDate = new Date(dobString);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function calculateMatchScore(userProfile: IProfile, candidateProfile: IProfile): MatchResult {
  let ageScore = 15; // default moderate score
  const candidateAge = calculateAge(candidateProfile.date_of_birth);
  const minAge = userProfile.preferred_min_age;
  const maxAge = userProfile.preferred_max_age;

  if (candidateAge !== null && minAge !== null && maxAge !== null) {
    if (candidateAge >= minAge && candidateAge <= maxAge) {
      ageScore = 20;
    } else if (Math.abs(candidateAge - minAge) <= 2 || Math.abs(candidateAge - maxAge) <= 2) {
      ageScore = 12;
    } else {
      ageScore = 5;
    }
  } else if (candidateAge !== null && userProfile.date_of_birth) {
    const userAge = calculateAge(userProfile.date_of_birth);
    if (userAge !== null && Math.abs(candidateAge - userAge) <= 5) {
      ageScore = 18;
    }
  }

  // 2. Location (20%)
  let locationScore = 10;
  const prefLoc = userProfile.preferred_location?.toLowerCase();
  const userCity = userProfile.city?.toLowerCase();
  const userState = userProfile.state?.toLowerCase();
  const userCountry = userProfile.country?.toLowerCase();

  const candCity = candidateProfile.city?.toLowerCase();
  const candState = candidateProfile.state?.toLowerCase();
  const candCountry = candidateProfile.country?.toLowerCase();

  if (candCity && userCity && candCity === userCity) {
    locationScore = 20;
  } else if (candState && userState && candState === userState) {
    locationScore = 17;
  } else if (candCountry && userCountry && candCountry === userCountry) {
    locationScore = 14;
  } else if (prefLoc === "anywhere in india" || prefLoc === "worldwide") {
    locationScore = 16;
  }

  // 3. Denomination (20%)
  let denominationScore = 12;
  const prefDenom = userProfile.preferred_denomination?.toLowerCase();
  const userDenom = userProfile.denomination?.toLowerCase();
  const candDenom = candidateProfile.denomination?.toLowerCase();

  if (userDenom && candDenom && userDenom === candDenom) {
    denominationScore = 20;
  } else if (prefDenom?.includes("any")) {
    denominationScore = 18;
  } else if (candDenom) {
    denominationScore = 12;
  }

  // 4. Christian Background (20%)
  let christianScore = 10;
  if (candidateProfile.is_born_again) christianScore += 5;
  if (candidateProfile.is_baptized) christianScore += 5;

  // 5. Education (10%)
  let educationScore = 5;
  const prefEdu = userProfile.preferred_education?.toLowerCase();
  const candEdu = (candidateProfile.education || candidateProfile.profession || "").toLowerCase();

  if (prefEdu && candEdu && candEdu.includes(prefEdu)) {
    educationScore = 10;
  } else if (candidateProfile.education) {
    educationScore = 8;
  }

  // 6. Career / Ministry (10%)
  let careerMinistryScore = 5;
  if (candidateProfile.occupation || candidateProfile.profession) careerMinistryScore += 3;
  if (candidateProfile.ministry_responsibility || candidateProfile.other_ministry) careerMinistryScore += 2;
  if (careerMinistryScore > 10) careerMinistryScore = 10;

  const totalScore = ageScore + locationScore + denominationScore + christianScore + educationScore + careerMinistryScore;

  return {
    profile: candidateProfile,
    matchScore: Math.min(100, Math.max(0, totalScore)),
    breakdown: {
      ageScore,
      locationScore,
      denominationScore,
      christianScore,
      educationScore,
      careerMinistryScore,
    },
  };
}
