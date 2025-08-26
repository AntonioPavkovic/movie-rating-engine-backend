export class RatingValue {
  constructor(private readonly value: number) {
    this.validate();
  }

  private validate(): void {
    if (!Number.isInteger(this.value) || this.value < 1 || this.value > 5) {
      throw new Error('Rating must be an integer between 1 and 5');
    }
  }

  getValue(): number {
    return this.value;
  }

  equals(other: RatingValue): boolean {
    return this.value === other.value;
  }
}