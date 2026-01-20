
import { test as base } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export const TEST_CREDENTIALS = {
    get OWNER_EMAIL() {
        if (!process.env.TEST_OWNER_EMAIL) {
            throw new Error('TEST_OWNER_EMAIL environment variable is missing.');
        }
        return process.env.TEST_OWNER_EMAIL;
    },
    get OWNER_PASSWORD() {
        if (!process.env.TEST_OWNER_PASSWORD) {
            throw new Error('TEST_OWNER_PASSWORD environment variable is missing.');
        }
        return process.env.TEST_OWNER_PASSWORD;
    },
    get HEAD_EMAIL() { return process.env.TEST_HEAD_EMAIL || 'test1@test.com'; },
    get HEAD_PASSWORD() { return process.env.TEST_HEAD_PASSWORD || '123456'; },
    get LEAD_EMAIL() { return process.env.TEST_LEAD_EMAIL || 'test2@test.com'; },
    get LEAD_PASSWORD() { return process.env.TEST_LEAD_PASSWORD || '123456'; },
    get MEMBER_EMAIL() { return process.env.TEST_MEMBER_EMAIL || 'test3@test.com'; },
    get MEMBER_PASSWORD() { return process.env.TEST_MEMBER_PASSWORD || '123456'; }
};

export const test = base.extend({});
