import type { ChatMessage } from '../model/chat-message.entity';

/**
 * Interface for the chatbot service.
 * Allows swapping between stub and real AI implementations
 * without modifying UI components.
 */
export interface IChatbotService {
  sendMessage(content: string): Promise<ChatMessage>;
}

/**
 * Stub implementation of the chatbot service.
 * Returns a placeholder bot response after a short delay
 * to simulate network latency.
 */
export class StubChatbotService implements IChatbotService {
  private nextId = 1;

  async sendMessage(content: string): Promise<ChatMessage> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const response: ChatMessage = {
      id: this.nextId++,
      content: `I received your question about: "${content}". This is a placeholder response. A real botanical AI will be integrated here soon.`,
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };

    return response;
  }
}
