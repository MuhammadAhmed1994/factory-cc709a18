import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, PASSWORD, uniqueEmail } from '../test-utils';

describe('Dashboard API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  async function newAgent() {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/register').send({ email: uniqueEmail('dash'), password: PASSWORD }).expect(201);
    return agent;
  }

  it('[AC-5] GET /dashboard returns 401 without a session', async () => {
    await request(app.getHttpServer()).get('/dashboard').expect(401);
  });

  it('[AC-13] returns the month total, count and up to 10 recent expenses newest first, for the caller only', async () => {
    const agent = await newAgent();
    const other = await newAgent();
    for (let day = 1; day <= 12; day += 1) {
      const date = `2026-03-${String(day).padStart(2, '0')}`;
      await agent.post('/expenses').send({ title: `Item ${day}`, amount: '10.10', date, category: 'food' }).expect(201);
    }
    await agent.post('/expenses').send({ title: 'Other month', amount: '5', date: '2026-02-20', category: 'bills' }).expect(201);
    await other.post('/expenses').send({ title: 'Not mine', amount: '500', date: '2026-03-20', category: 'bills' }).expect(201);

    const res = await agent.get('/dashboard').query({ month: '2026-03' }).expect(200);
    expect(res.body.month).toBe('2026-03');
    expect(res.body.total).toBe('121.20');
    expect(res.body.count).toBe(12);
    expect(res.body.recent).toHaveLength(10);
    expect(res.body.recent[0].title).toBe('Item 12');
    expect(res.body.recent[9].title).toBe('Item 3');
    expect(res.body.recent.some((e: { title: string }) => e.title === 'Not mine')).toBe(false);
  });

  it('[AC-13] defaults to the current month and rejects a malformed month', async () => {
    const agent = await newAgent();
    const res = await agent.get('/dashboard').expect(200);
    expect(res.body.month).toBe(new Date().toISOString().slice(0, 7));
    await agent.get('/dashboard').query({ month: 'bad' }).expect(400);
  });

  it('[AC-13] a user without expenses gets a zero total, zero count and empty recent list', async () => {
    const agent = await newAgent();
    const res = await agent.get('/dashboard').query({ month: '2026-03' }).expect(200);
    expect(res.body).toMatchObject({ total: '0.00', count: 0, recent: [] });
  });
});