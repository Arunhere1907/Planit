import ragData from "../../data/rag_corpus.json";

export interface RAGChunk {
  id: string;
  title: string;
  category: string;
  city: string;
  content: string;
  source: string;
}

/**
 * Retrieves top matching knowledge chunks for grounding AI generation.
 * Cites the exact source in outputs.
 */
export function queryRAGContext(query: { city?: string; type?: string; keywords?: string[] }): {
  contextText: string;
  citedSources: string[];
} {
  const corpus = ragData as RAGChunk[];
  const city = (query.city || "").toLowerCase();
  const type = (query.type || "").toLowerCase();
  const keywords = (query.keywords || []).map((k) => k.toLowerCase());

  const scored = corpus.map((chunk) => {
    let score = 0;
    const text = (chunk.title + " " + chunk.content + " " + chunk.city).toLowerCase();

    if (city && (chunk.city.toLowerCase().includes(city) || chunk.city.toLowerCase().includes("pan-india") || chunk.city.toLowerCase().includes("all metros"))) {
      score += 5;
    }
    if (type && text.includes(type)) {
      score += 4;
    }
    for (const kw of keywords) {
      if (text.includes(kw)) score += 2;
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topChunks = scored.slice(0, 3).map((s) => s.chunk);

  const contextText = topChunks
    .map(
      (c) =>
        `[Source: "${c.source}" | Topic: ${c.title}]\n${c.content}`
    )
    .join("\n\n");

  const citedSources = topChunks.map((c) => c.source);

  return { contextText, citedSources };
}
