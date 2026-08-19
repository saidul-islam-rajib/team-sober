import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JsonCollection } from '../shared/persistence/json-collection';
import { normaliseEmail } from '../accounts/account.rules';
import { needsRehash, seal, sealMatches } from '../accounts/secret';
import { Admin } from './admin.model';

export interface AdminCredentials {
  email?: string;
  password?: string;
}

@Injectable()
export class AdminsService {
  private readonly store = new JsonCollection<Admin>({
    file: 'admins.json',
    key: 'admins',
    label: 'admin(s)',
  });

  list(): Admin[] {
    return [...this.store.all()].sort((a, b) => a.email.localeCompare(b.email));
  }

  findById(id?: string): Admin | undefined {
    return id ? this.store.find((admin) => admin.id === id) : undefined;
  }

  findByEmail(email?: string): Admin | undefined {
    const wanted = normaliseEmail(email);
    if (!wanted) return undefined;

    return this.store.find((admin) => admin.email === wanted);
  }

  get count(): number {
    return this.store.size;
  }

  async create(email: string, password: string): Promise<Admin> {
    const now = new Date().toISOString();

    return this.store.add({
      id: randomUUID(),
      email: normaliseEmail(email),
      secret: await seal(password),
      createdAt: now,
      updatedAt: now,
    });
  }

  async authenticate({
    email,
    password,
  }: AdminCredentials): Promise<Admin | undefined> {
    const admin = this.findByEmail(email);

    if (!admin || !(await sealMatches(admin.secret, password ?? ''))) {
      return undefined;
    }

    if (needsRehash(admin.secret)) {
      admin.secret = await seal(password ?? '');
      this.store.persist();
    }

    return admin;
  }

  async resetPassword(
    id: string,
    password: string,
  ): Promise<Admin | undefined> {
    const admin = this.findById(id);
    if (!admin) return undefined;

    admin.secret = await seal(password);
    admin.updatedAt = new Date().toISOString();
    this.store.persist();

    return admin;
  }

  changeEmail(id: string, email: string): Admin | undefined {
    const admin = this.findById(id);
    if (!admin) return undefined;

    admin.email = normaliseEmail(email);
    admin.updatedAt = new Date().toISOString();
    this.store.persist();

    return admin;
  }

  remove(id: string): void {
    this.store.replaceAll(this.store.filter((admin) => admin.id !== id));
  }
}
