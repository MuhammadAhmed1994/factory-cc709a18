import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, PASSWORD, uniqueEmail } from '../test-utils';

describe('Summary API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });

  afterAll(async () => {
    await app.close();
  });

  async function newAgent() {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/auth/register').send({ email: uniqueEmail('sum'), password: PASSWORD }).expect(201);
    return agent;
  }

  it('[AC-5] GET /summary returns 401 without a session', async () => {
    await request(app.getHttpServer()).get('/summary').query({ month: '2026-03' }).expect(401);
  });

  it('[AC-18] returns the caller total and a per-category breakdown that sums to the total', async () => {
    const agent = await newAgent();
    const other = await newAgent();
    await agent.post('/expenses').send({ title: 'a', amount: '0.10', date: '2026-03-01', category: 'food' }).expect(201);
    await agent.post('/expenses').send({ title: 'b', amount: '0.20', date: '2026-03-31', category: 'food' }).expect(201);
    await agent.post('/expenses').send({ title: 'c', amount: '100.05', date: '2026-03-15', category: 'bills' }).expect(201);
    // outside the month and other user's data must not count
    await agent.post('/expenses').send({ title: 'd', amount: '50', date: '2026-04-01', category: 'food' }).expect(201);
    await agent.post('/expenses').send({ title: 'e', amount: '50', date: '2026-02-28', category: 'food' }).expect(201);
    await other.post('/expenses').send({ title: 'f', amount: '999', date: '2026-03-10', category: 'food' }).expect(201);

    const res = await agent.get('/summary').query({ month: '2026-03' }).expect(200);
    expect(res.body.month).toBe('2026-03');
    expect(res.body.total).toBe('100.35');
    expect(res.body.count).toBe(3);
    expect(res.body.breakdown.map((b: { category: string }) => b.category).sort()).toEqual([
      'bills',
      'education',
      'food',
      'shopping',
      'transport',
    ]);
    const byCat = Object.fromEntries(res.body.breakdown.map((b: { category: string; total: string }) => [b.category, b.total]));
    expect(byCat.food).toBe('0.30');
    expect(byCat.bills).toBe('100.05');
    expect(byCat.transport).toBe('0.00');
    const sumCents = res.body.breakdown.reduce(
      (acc: number, b: { total: string }) => acc + Math.round(Number(b.total) * 100),
      0,
    );
    expect(sumCents).toBe(Math.round(Number(res.body.total) * 100));
  });

  it('[AC-19] a malformed month returns 400', async () => {
    const agent = await newAgent();
    await agent.get('/summary').expect(400);
    await agent.get('/summary').query({ month: '2026-13' }).expect(400);
    await agent.get('/summary').query({ month: 'March' }).expect(400);
    await agent.get('/summary').query({ month: '2026-3' }).expect(400);
  });

  it('[AC-19] a month with no expenses returns total 0 and a zero breakdown', async () => {
    const agent = await newAgent();
    const res = await agent.get('/summary').query({ month: '2026-01' }).expect(200);
    expect(res.body.total).toBe('0.00');
    expect(res.body.count).toBe(0);
    expect(res.body.breakdown).toHaveLength(5);
    expect(res.body.breakdown.every((b: { total: string; count: number }) => b.total === '0.00' && b.count === 0)).toBe(true);
  });
});