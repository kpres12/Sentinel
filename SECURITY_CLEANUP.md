# Security Cleanup: Remove Secrets from Git History

## ⚠️ CRITICAL: .env File Was Committed

The `.env` file containing secrets has been removed from the current commit, but **it still exists in git history**. Anyone with access to the repository can retrieve past commits and extract the secrets.

## Immediate Actions Required

### 1. Rotate All Compromised Secrets

Before cleaning git history, rotate these secrets immediately:

```bash
# Database password
# Redis password
# MQTT passwords
# JWT secrets (if any were set)
```

### 2. Clean Git History (Choose One Method)

#### Option A: Using BFG Repo-Cleaner (Recommended)

```bash
# Install BFG
brew install bfg  # macOS
# or download from https://rtyley.github.io/bfg-repo-cleaner/

# Backup your repo first
cd /Users/kpres12/Downloads/Sentinel
git clone --mirror . ../Sentinel-backup.git

# Remove .env from all commits
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: this rewrites history)
git push origin --force --all
git push origin --force --tags
```

#### Option B: Using git-filter-repo (Alternative)

```bash
# Install
pip install git-filter-repo

# Remove .env from history
git filter-repo --path .env --invert-paths

# Force push
git push origin --force --all
```

#### Option C: Using git filter-branch (Built-in but slower)

```bash
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

git reflog expire --expire=now --all
git gc --prune=now --aggressive

git push origin --force --all
git push origin --force --tags
```

### 3. Notify Team Members

After cleaning history, all team members must:

```bash
# Delete local repo
cd ~/path/to/Sentinel
cd ..
rm -rf Sentinel

# Re-clone
git clone <repo-url>
cd Sentinel
```

**Do NOT use `git pull`** – it will re-introduce the old history.

### 4. Update Production Secrets

1. Copy `.env.production.template` to `.env.production`
2. Generate new secrets:
   ```bash
   # Generate a secret
   openssl rand -hex 32
   
   # Or for base64
   openssl rand -base64 32
   ```
3. Update secrets in your secrets manager (AWS Secrets Manager, Vault, etc.)
4. Redeploy with new secrets

### 5. Enable Branch Protection (GitHub/GitLab)

- Require pull request reviews
- Enable status checks
- Prevent force pushes to main/master (after cleanup)
- Enable secret scanning alerts

## Prevention Checklist

- [x] `.env` removed from tracking
- [x] `.gitignore` updated to block all `.env*` files
- [x] `.env.production.template` created with no secrets
- [ ] Git history cleaned (choose method above)
- [ ] All secrets rotated
- [ ] Team notified to re-clone
- [ ] Branch protection enabled
- [ ] Secret scanning enabled (GitHub Advanced Security)

## For New Team Members

Never commit files containing:
- Passwords
- API keys
- Private keys
- Certificates
- Tokens
- Any credential or secret

Always use:
- `.env.template` files with placeholder values
- Environment variables at runtime
- Secrets managers (AWS Secrets Manager, HashiCorp Vault, etc.)
- Git hooks to prevent secret commits (see `.git/hooks/pre-commit.sample`)

## Additional Resources

- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
