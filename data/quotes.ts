//data/quotes.ts
import { quotes } from '../app/data'; 

export interface Quote {
  id: number;
  text: string;
  author: string;
  category: string;
}

// This function now uses the imported quotes list
export function getRandomQuote(category: string = "All"): Quote {
  const filteredQuotes = category === "All" 
    ? quotes 
    : quotes.filter(q => q.category === category);
    
  if (filteredQuotes.length === 0) {
      // Return a default quote if no matches are found
      return { id: 0, text: "No quotes found for this category.", author: "Spark App", category: "Info" };
  }
  
  return filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
}
