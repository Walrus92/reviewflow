export type ReviewObservation = {
  id: string;
  subject: "own" | "competitor";
  businessName: string;
  rating: number;
  text: string;
  publishedAt: string;
  source: "demo" | "authorized";
};

export interface ReviewSource {
  readonly name: string;
  listReviews(): Promise<ReviewObservation[]>;
}

const topics: Record<string, string[]> = {
  atención: ["atención", "trato", "personal", "service", "staff"],
  espera: ["espera", "tardó", "lento", "wait", "slow"],
  precio: ["precio", "caro", "coste", "price", "expensive"],
  calidad: ["calidad", "resultado", "trabajo", "quality", "result"],
};

export type ReviewAnalysis = {
  total: number;
  averageRating: number | null;
  negativeCount: number;
  topicCounts: Record<string, number>;
  negativeTopics: string[];
};

export function analyzeReviews(reviews: ReviewObservation[]): ReviewAnalysis {
  const topicCounts: Record<string, number> = {};
  const negativeTopicCounts: Record<string, number> = {};
  for (const review of reviews) {
    const normalized = review.text.toLocaleLowerCase("es");
    for (const [topic, keywords] of Object.entries(topics)) {
      if (keywords.some((keyword) => normalized.includes(keyword))) {
        topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
        if (review.rating <= 2) negativeTopicCounts[topic] = (negativeTopicCounts[topic] ?? 0) + 1;
      }
    }
  }
  return {
    total: reviews.length,
    averageRating: reviews.length
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null,
    negativeCount: reviews.filter((review) => review.rating <= 2).length,
    topicCounts,
    negativeTopics: Object.entries(negativeTopicCounts)
      .sort((a, b) => b[1] - a[1]).map(([topic]) => topic),
  };
}
