/**
 * Represents a single message in the chatbot conversation history.
 */
export interface ChatMessage {
  id: number;
  content: string;
  sender: 'user' | 'bot';
  timestamp: string;
}
