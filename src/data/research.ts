export interface ResearchResult {
  title: string;
  year: number;
  venue?: string;
  authors?: string;
  description?: string;
  links?: { label: string; href: string }[];
}

export const researchResults: ResearchResult[] = [];
