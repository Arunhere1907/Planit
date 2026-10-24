/**
 * Generic In-Memory Store Helper (Map-based CRUD)
 */
export class InMemoryStore<T extends { id: string }> {
  private items = new Map<string, T>();

  public getAll(): T[] {
    return Array.from(this.items.values());
  }

  public getById(id: string): T | null {
    return this.items.get(id) || null;
  }

  public set(item: T): T {
    this.items.set(item.id, item);
    return item;
  }

  public update(id: string, partial: Partial<T>): T | null {
    const existing = this.items.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...partial };
    this.items.set(id, updated);
    return updated;
  }

  public delete(id: string): boolean {
    return this.items.delete(id);
  }

  public clear(): void {
    this.items.clear();
  }

  public populate(seedItems: T[]): void {
    this.clear();
    for (const item of seedItems) {
      this.items.set(item.id, item);
    }
  }

  public count(): number {
    return this.items.size;
  }
}
