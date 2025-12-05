export class RequestTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms.`);
    this.name = 'RequestTimeoutError';
  }
}

export class RejectRequestError extends Error {
  constructor() {
    super("Request was rejected by the wallet.");
    this.name = 'RejectRequestError';
  }
}

