
import { test as base } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

export const TEST_CREDENTIALS = {
    get OWNER_EMAIL() {
        return process.env.TEST_OWNER_EMAIL || 'Diegomenendez1@gmail.com';
    },
    get OWNER_PASSWORD() {
        return process.env.TEST_OWNER_PASSWORD || 'Yali.202';
    },
    get HEAD_EMAIL() { return process.env.TEST_HEAD_EMAIL || 'test1@test.com'; },
    get HEAD_PASSWORD() { return process.env.TEST_HEAD_PASSWORD || '123456'; },
    get LEAD_EMAIL() { return process.env.TEST_LEAD_EMAIL || 'test2@test.com'; },
    get LEAD_PASSWORD() { return process.env.TEST_LEAD_PASSWORD || '123456'; },
    get MEMBER_EMAIL() { return process.env.TEST_MEMBER_EMAIL || 'test3@test.com'; },
    get MEMBER_PASSWORD() { return process.env.TEST_MEMBER_PASSWORD || '123456'; }
};

export const test = base.extend({});
