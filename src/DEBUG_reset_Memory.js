// To clean up after a private server restore

for (let key in Memory) {
    delete Memory[key];
}
