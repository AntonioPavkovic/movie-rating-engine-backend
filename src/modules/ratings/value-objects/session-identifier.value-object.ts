export class SessionIdentifier {
  constructor(
    private readonly sessionId?: string,
    private readonly userId?: string,
    private readonly ipAddress?: string
  ) {
    if (!sessionId && !userId && !ipAddress) {
      throw new Error('At least one identifier must be provided');
    }
  }

  getSessionId(): string | undefined {
    return this.sessionId;
  }

  getUserId(): string | undefined {
    return this.userId;
  }

  getIpAddress(): string | undefined {
    return this.ipAddress;
  }

  isDuplicate(other: SessionIdentifier): boolean {
    return Boolean(
      (this.sessionId && this.sessionId === other.sessionId) ||
      (this.userId && this.userId === other.userId)
    );
  }
}