const assert = require('assert');

// Mock Data
const users = {
    'manager1': { id: 'manager1', name: 'Alice (Manager)', role: 'manager', reportsTo: null },
    'employee1': { id: 'employee1', name: 'Bob (Report)', role: 'member', reportsTo: 'manager1' },
    'employee2': { id: 'employee2', name: 'Charlie (Report)', role: 'member', reportsTo: 'manager1' },
    'other1': { id: 'other1', name: 'Dave (Other)', role: 'member', reportsTo: null }
};

const tasks = [
    { id: 't1', title: 'Bob Private Task', ownerId: 'employee1', visibility: 'private', assigneeIds: [] },
    { id: 't2', title: 'Bob Team Task', ownerId: 'employee1', visibility: 'team', assigneeIds: [] },
    { id: 't3', title: 'Manager Private', ownerId: 'manager1', visibility: 'private', assigneeIds: [] },
    { id: 't4', title: 'Shared with Dave', ownerId: 'manager1', visibility: 'private', assigneeIds: ['other1'] }
];

// The Filtering Logic (Mirrors TeamBoardView.tsx)
function getVisibleTasks(user, allTasks, allUsers) {
    return allTasks.filter(t => {
        const isShared = t.visibility === 'team' || (t.assigneeIds && t.assigneeIds.length > 0);

        // 0. ABSOLUTE ACCESS
        if (user.role === 'owner' || user.role === 'admin') return true;

        const isOwner = t.ownerId === user.id;
        const isAssigned = t.assigneeIds && t.assigneeIds.includes(user.id);

        if (isOwner || isAssigned) return true;

        // 1. Strict Privacy
        if (t.visibility === 'private') return false;

        if (!isShared) return false;

        // 3. Hierarchy
        const taskOwner = allUsers[t.ownerId];
        if (!taskOwner) return isShared;

        // Am I their manager?
        if (taskOwner.reportsTo === user.id) {
            return true;
        }

        if (isShared) return true;

        return false;
    });
}

console.log("--- Starting Hierarchy Verification ---");

// Test 1: Manager sees Employee Public/Team Tasks
const managerView = getVisibleTasks(users['manager1'], tasks, users);
const seesBobTeam = managerView.find(t => t.id === 't2');
console.log(`Test 1 (Manager sees Report's Team Task): ${seesBobTeam ? 'PASS' : 'FAIL'}`);

// Test 2: Manager does NOT see Employee 'Private' Task (Strict Mode)
const seesBobPrivate = managerView.find(t => t.id === 't1');
console.log(`Test 2 (Manager respects Report's Private Task): ${!seesBobPrivate ? 'PASS' : 'FAIL'}`);

// Test 3: Report does NOT see Manager's Private Task
const bobView = getVisibleTasks(users['employee1'], tasks, users);
const seesManagerPrivate = bobView.find(t => t.id === 't3');
console.log(`Test 3 (Report does NOT see Manager Private): ${!seesManagerPrivate ? 'PASS' : 'FAIL'}`);

// Test 4: Other sees assigned task
const daveView = getVisibleTasks(users['other1'], tasks, users);
const seesAssigned = daveView.find(t => t.id === 't4');
console.log(`Test 4 (Assignee sees assigned task): ${seesAssigned ? 'PASS' : 'FAIL'}`);

console.log("--- Verification Complete ---");
