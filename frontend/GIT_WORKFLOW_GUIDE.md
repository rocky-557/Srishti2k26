# Git Workflow & Branch Management Guide

## 1. Checking Commits on a Friend's Branch

### Step 1: Fetch the latest updates from GitHub/GitLab
First, fetch all remote branch updates so your local Git is aware of any commits your friend recently pushed:

```bash
git fetch origin
```

### Step 2: List all remote branches
To confirm your friend's branch name on the remote repository:

```bash
git branch -r
```
*(This lists remote branches like `origin/main`, `origin/friend-branch`, etc.)*

---

### Step 3: Check new commits on your friend's branch

#### Option A: See list of commits that are on your friend's branch but NOT on `main` (Recommended)
```bash
git log main..origin/<friend-branch-name> --oneline
```

**Example:** If your friend's branch is named `dev-john`:
```bash
git log main..origin/dev-john --oneline
```

* If this returns commit messages, those are the **new commits** your friend added.
* If it returns empty, your friend's branch has **no new commits** beyond `main`.

#### Option B: See count of commits ahead/behind
To quickly check how many commits their branch is ahead of `main`:

```bash
git rev-list --count main..origin/<friend-branch-name>
```

---

### Step 4: Inspect the actual file/code changes (Diff)
If you want to see the exact code lines your friend added or changed before merging:

```bash
git diff main..origin/<friend-branch-name>
```
*(Or to see only the names of modified files: `git diff --stat main..origin/<friend-branch-name>`)*

> **TIP:** If `git branch -r` only shows `origin/main`, ask your friend to run `git push origin <their-branch-name>` from their computer so their branch becomes visible to you!

---

## 2. Merging Changes from a Friend's Branch to `main` Without Conflicts

To pull changes from your friends' branches into the `main` branch smoothly and minimize merge conflicts, follow this recommended Git workflow:

### Step 1: Ensure Your Working Tree is Clean
Before pulling or merging any code, make sure you don't have uncommitted local changes on `main`.

```bash
# Check your local status
git status

# If you have uncommitted work, either commit it:
git add .
git commit -m "Save local work"

# Or temporarily stash it:
git stash
```

### Step 2: Fetch the Latest Branches from Remote (GitHub/GitLab)
Fetch all remote updates so your local Git knows about any new commits or branches created by your friends without altering your working directory.

```bash
git fetch origin
```

### Step 3: Switch to `main` and Update It
Make sure your local `main` branch is completely up to date with the remote `main`.

```bash
git checkout main
git pull origin main
```

### Step 4: Merge Your Friend's Branch into `main`

#### Option A: Direct Merge (Local Terminal)
If your friend pushed their branch (e.g. `feature-branch` or `friend-name`) to GitHub/GitLab:

```bash
# Merge their branch into your main branch
git merge origin/friend-branch
```
If there are no overlapping line edits, Git will perform a Fast-Forward or automatic merge seamlessly!

Then push the updated `main` back to remote:
```bash
git push origin main
```

#### Option B: Pull Request / Merge Request (Recommended Team Best Practice)
1. Have your friend create a **Pull Request (PR)** on GitHub/GitLab from their branch to `main`.
2. Review their changes on GitHub.
3. Click **Merge Pull Request**.
4. On your machine, simply run:
```bash
git checkout main
git pull origin main
```

---

## 💡 Pro-Tips to Avoid Conflicts Completely

* **Friends should sync `main` often into their branches:**
  Before asking you to pull their branch, your friends should run:
  ```bash
  git checkout friend-branch
  git pull origin main
  ```
  If there are any conflicts, they resolve them in their branch before merging into `main`.

* **Divide Work by Files/Modules:**
  Try to avoid having multiple people edit the exact same lines in the exact same file (e.g., `workshop.html`) at the same time. Split components, CSS files, or JavaScript scripts into separate modular files where possible.

* **Live Updating / Auto-Refresh:**
  If you are running a local dev server (like VS Code **Live Server** extension, Vite, or `npx live-server`), saving/updating files after `git pull` will automatically refresh your browser live.

 0fe2443..2c6cb7d  main       -> origin/main
 * [new branch]      Bavithra   -> origin/Bavithra
 * [new branch]      Pragati    -> origin/Pragati
 * [new branch]      Prajeet    -> origin/Prajeet
 * [new branch]      Raja       -> origin/Raja
 * [new branch]      Sathya     -> origin/Sathya
 * [new branch]      Sudar      -> origin/Sudar
 * [new branch]      Sujay      -> origin/Sujay
 * [new branch]      prav       -> origin/prav