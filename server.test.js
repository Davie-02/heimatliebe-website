/**
 * @file Unit tests for server.js API router and handlers.
 * To run: `npm test`
 */

import { jest } from '@jest/globals';

// Mock external dependencies before importing the server module
const mockSupabase = jest.fn();
const mockFs = {
  mkdir: jest.fn().mockResolvedValue(),
  readFile: jest.fn().mockResolvedValue('[]'),
  writeFile: jest.fn().mockResolvedValue(),
};

jest.unstable_mockModule('http', () => ({
  createServer: jest.fn(() => ({
    listen: jest.fn(),
  })),
}));

jest.unstable_mockModule('fs', () => ({
  promises: mockFs,
}));

// Mock the global fetch used by the supabase helper
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  status: 200,
  text: () => Promise.resolve('[]'),
}));

// We need to import all handlers to test them.
// We also need to mock the `json` helper used inside them.
let serverModule;
let mockJsonHelper;

beforeAll(async () => {
  // Mock the json helper function before importing the server
  mockJsonHelper = jest.fn();
  jest.unstable_mockModule('./server.js', () => {
    const originalModule = jest.requireActual('./server.js');
    return { ...originalModule, json: mockJsonHelper };
  });
  serverModule = await import('./server.js');
});

describe('API Router', () => {
  beforeEach(() => {
    mockJsonHelper.mockClear();
    mockSupabase.mockClear();
    global.fetch.mockClear();
  });

  // --- Test Router Class ---
  describe('Router Class', () => {
    it('should add and find a simple route', () => {
      const router = serverModule.apiRouter; // Use the existing instance
      const route = router.find('GET', '/api/courses');
      expect(route).not.toBeNull();
      expect(typeof route.handler).toBe('function');
    });

    it('should find a route with parameters', () => {
      const router = serverModule.apiRouter;
      const route = router.find('PATCH', '/api/courses/123');
      expect(route).not.toBeNull();
      expect(route.params).toEqual({ table: 'courses', id: '123' });
    });

    it('should return null for a non-existent route', () => {
      const router = serverModule.apiRouter;
      const route = router.find('GET', '/api/non-existent-route');
      expect(route).toBeNull();
    });

    it('should return null for a wrong method', () => {
      const router = serverModule.apiRouter;
      const route = router.find('PUT', '/api/courses');
      expect(route).toBeNull();
    });
  });

  // --- Test Generic Handlers ---
  describe('Generic Table Handlers', () => {
    it('handleGetTable should fetch data and return 200', async () => {
      const mockData = [{ id: 1, title: 'German A1' }];
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(mockData))
      });

      const ctx = { res: {}, query: {}, params: { table: 'courses' } };
      await serverModule.handleGetTable(ctx);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rest/v1/courses'), expect.any(Object));
      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 200, mockData);
    });

    it('handleGetTable should return 403 for a disallowed table', async () => {
      const ctx = { res: {}, query: {}, params: { table: 'pg_authid' } };
      await serverModule.handleGetTable(ctx);
      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 403, { error: 'Table not allowed' });
    });

    it('handlePostTable should create data and return 201', async () => {
      const newCourse = { title: 'French B1' };
      const createdCourse = { id: 2, ...newCourse };
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 201, text: () => Promise.resolve(JSON.stringify([createdCourse]))
      });

      const ctx = { res: {}, body: newCourse, params: { table: 'courses' } };
      await serverModule.handlePostTable(ctx);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rest/v1/courses'), expect.objectContaining({ method: 'POST' }));
      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 201, [createdCourse]);
    });

    it('handlePatchTable should update data and return 200', async () => {
      const updatedData = { status: 'Full' };
      const returnedData = { id: 1, title: 'German A1', status: 'Full' };
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: () => Promise.resolve(JSON.stringify([returnedData]))
      });

      const ctx = { res: {}, body: updatedData, params: { table: 'courses', id: '1' } };
      await serverModule.handlePatchTable(ctx);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rest/v1/courses?id=eq.1'), expect.objectContaining({ method: 'PATCH' }));
      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 200, [returnedData]);
    });

    it('handleDeleteTable should delete data and return 200', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 204, text: () => Promise.resolve('')
      });

      const ctx = { res: {}, params: { table: 'courses', id: '1' } };
      await serverModule.handleDeleteTable(ctx);

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/rest/v1/courses?id=eq.1'), expect.objectContaining({ method: 'DELETE' }));
      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 200, { ok: true });
    });
  });

  // --- Test Specific Handlers ---
  describe('Specific API Handlers', () => {
    it('handleLogin should return user on success', async () => {
      const mockUser = { id: 1, user_id: 'STUDENT-001', role: 'student' };
      global.fetch.mockResolvedValueOnce({
        ok: true, status: 200, text: () => Promise.resolve(JSON.stringify([mockUser]))
      });

      const ctx = { res: {}, body: { user_id: 'STUDENT-001', password: 'password123' } };
      // We need to mock hashPw for this handler
      serverModule.hashPw = () => 'hashed_password';
      await serverModule.handleLogin(ctx);

      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 200, { user: mockUser });
    });

    it('handleLogin should return 401 on failure', async () => {
      global.fetch.mockResolvedValue({
        ok: false, status: 200, text: () => Promise.resolve(JSON.stringify([])) // Supabase returns 200 with empty array for no match
      });

      const ctx = { res: {}, body: { user_id: 'STUDENT-001', password: 'wrongpassword' } };
      serverModule.hashPw = () => 'hashed_password';
      await serverModule.handleLogin(ctx);

      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 401, { error: 'Invalid credentials' });
    });

    it('handleVerifyAdmin should return 200 on correct password', async () => {
      const ctx = { res: {}, body: { password: 'test-admin-password' } };
      // Temporarily set the config for this test
      const originalPassword = serverModule.CFG.ADMIN_PASSWORD;
      serverModule.CFG.ADMIN_PASSWORD = 'test-admin-password';

      await serverModule.handleVerifyAdmin(ctx);

      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 200, { ok: true });
      serverModule.CFG.ADMIN_PASSWORD = originalPassword; // Restore
    });

    it('handleVerifyAdmin should return 401 on incorrect password', async () => {
      const ctx = { res: {}, body: { password: 'wrong-password' } };
      const originalPassword = serverModule.CFG.ADMIN_PASSWORD;
      serverModule.CFG.ADMIN_PASSWORD = 'test-admin-password';

      await serverModule.handleVerifyAdmin(ctx);

      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 401, { error: 'Incorrect password' });
      serverModule.CFG.ADMIN_PASSWORD = originalPassword; // Restore
    });

    it('handleVerifyAdmin should return 500 if password is not configured', async () => {
      const ctx = { res: {}, body: { password: 'any-password' } };
      const originalPassword = serverModule.CFG.ADMIN_PASSWORD;
      serverModule.CFG.ADMIN_PASSWORD = ''; // Unset password

      await serverModule.handleVerifyAdmin(ctx);

      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 500, { error: 'Admin password not configured' });
      serverModule.CFG.ADMIN_PASSWORD = originalPassword; // Restore
    });

    it('handleSubmitApplication should return 400 if required fields are missing', async () => {
      const ctx = { res: {}, body: { full_name: 'Test User', email: 'test@test.com' } }; // Missing password, course, level
      await serverModule.handleSubmitApplication(ctx);
      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 400, { error: 'Missing required application fields.' });
    });

    it('handleContactEnquiry should save to a file and return 200', async () => {
      const ctx = { res: {}, body: { name: 'Test', email: 'test@test.com' } };
      await serverModule.handleContactEnquiry(ctx);

      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockJsonHelper).toHaveBeenCalledWith(ctx.res, 200, { ok: true, message: 'Thank you! We will be in touch.' });
    });
  });
});