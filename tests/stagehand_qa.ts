import { Stagehand } from '@browserbasehq/stagehand';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const APP_URL = 'http://localhost:3001';

async function runTests(email: string, password: string, role: string) {
    console.log(`\n--- Starting Tests for Role: ${role} (${email}) ---`);

    const stagehand = new Stagehand({
        env: "LOCAL",
        modelName: "gpt-4o-mini",
        modelClientOptions: {
            apiKey: process.env.OPENAI_API_KEY,
        },
        enableVisualOutlines: true
    });

    await stagehand.init();

    // @ts-ignore
    let page = stagehand.page;
    if (!page && stagehand.context) {
        // @ts-ignore
        const targets = stagehand.context.pagesByTarget;
        if (targets instanceof Map) {
            const keys = Array.from(targets.keys());
            if (keys.length > 0) page = targets.get(keys[0]);
        }
    }

    if (!page) {
        throw new Error("Could not find page object on stagehand instance");
    }

    try {
        // 1. LOGIN
        console.log(`[${role}] 1/6: Login Module...`);
        await page.goto(`${APP_URL}/auth`);
        await stagehand.act(`Type '${email}' into the email field.`);
        await stagehand.act(`Type '${password}' into the password field.`);
        await stagehand.act("Click the 'Sign In' button.");
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: `tests/screenshots/${role}_01_login.png` });

        // 2. INBOX MODULE
        console.log(`[${role}] 2/6: Inbox Module...`);
        await page.goto(`${APP_URL}/inbox`);
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: `tests/screenshots/${role}_02_inbox.png` });
        const inboxData = await stagehand.extract({
            instruction: "Look at the task list. List the titles of the first 3 tasks if they exist.",
            schema: {
                type: "object",
                properties: {
                    tasksFound: { type: "boolean" },
                    titles: { type: "array", items: { type: "string" } }
                }
            }
        });
        console.log(`[${role}] Inbox Status:`, inboxData);

        // 3. TASKS MODULE
        console.log(`[${role}] 3/6: Tasks Module...`);
        await page.goto(`${APP_URL}/tasks`);
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: `tests/screenshots/${role}_03_tasks.png` });
        await stagehand.act(`Click on the 'New Task' button, type 'QA Test ${role}' as title, and save it.`);
        console.log(`[${role}] Task creation attempted.`);

        // 4. CALENDAR MODULE
        console.log(`[${role}] 4/6: Calendar Module...`);
        await page.goto(`${APP_URL}/calendar`);
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: `tests/screenshots/${role}_04_calendar.png` });
        const calData = await stagehand.extract({
            instruction: "Is the calendar showing dates? What is the current month shown?",
            schema: {
                type: "object",
                properties: {
                    isShowingDates: { type: "boolean" },
                    month: { type: "string" }
                }
            }
        });
        console.log(`[${role}] Calendar Status:`, calData);

        // 5. SETTINGS MODULE
        console.log(`[${role}] 5/6: Settings Module...`);
        await page.goto(`${APP_URL}/settings`);
        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: `tests/screenshots/${role}_05_settings.png` });
        console.log(`[${role}] Settings page verified with screenshot.`);

        // 6. LOGOUT
        console.log(`[${role}] 6/6: Logging out...`);
        await stagehand.act("Find the sign out/logout button and click it.");
        await new Promise(r => setTimeout(r, 2000));
        console.log(`[${role}] cycle complete.`);

    } catch (error) {
        console.error(`[${role}] ERROR:`, error);
        try {
            await page.screenshot({ path: `tests/screenshots/${role}_FAILURE.png` });
        } catch (sError) { }
    } finally {
        await stagehand.close();
    }
}

async function main() {
    // Run for OWNER
    await runTests(
        process.env.TEST_OWNER_EMAIL || 'diegomenendez1@gmail.com',
        process.env.TEST_OWNER_PASSWORD || 'Yali.202',
        'OWNER'
    );

    // Run for HEAD (test1@test.com)
    await runTests(
        process.env.TEST_HEAD_EMAIL || 'test1@test.com',
        process.env.TEST_HEAD_PASSWORD || '123456',
        'HEAD'
    );
}

main().catch(console.error);
