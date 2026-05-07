import collegesData from "@/data/colleges.json";

export type College = {
  id: string;
  college: string;
  fullName: string;
  program: string;
  intake: "Jan" | "May" | "Sep";
  filter: "IT" | "Business" | "Healthcare" | "Trades";
  logo: string;
  highlight: string;
  description: string;
};

export const colleges: College[] = collegesData.colleges as College[];

// Convert college data to promotion card format for compatibility
export const collegeToPromotionCard = (college: College) => ({
  id: college.id,
  college: college.college,
  program: college.program,
  intake: college.intake,
  filter: college.filter,
  logo: college.logo,
  highlight: college.highlight,
});

