
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
    }
};

export const test = base.extend({});
