import { defineConfig } from 'vite';

const DEFAULT_REPO_NAME = 'pokemon-brawl';

export default defineConfig(() => {
  const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
    ?? process.env.npm_package_name
    ?? DEFAULT_REPO_NAME;

  return {
    base: process.env.GITHUB_PAGES === 'true' ? `/${repoName}/` : '/',
  };
});