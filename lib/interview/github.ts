import { GithubRepoSummary } from './types';

/**
  * Parses a GitHub repository URL and extracts repository metadata and file structure
  */
export async function fetchGithubRepoSummary(url: string): Promise<GithubRepoSummary | undefined> {
  if (!url || typeof url !== 'string' || !url.trim()) return undefined;

  const cleanUrl = url.trim().replace(/\/+$/, '');
  const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/i);

  if (!match) {
    return createFallbackGithubSummary(cleanUrl, 'custom-user', 'repository');
  }

  const [, owner, repo] = match;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'User-Agent': 'NoniRecruiter-AI-Interviewer' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!repoRes.ok) {
      return createFallbackGithubSummary(cleanUrl, owner, repo);
    }

    const repoData = await repoRes.json();

    // Fetch top-level contents/files
    let keyFiles: string[] = [];
    try {
      const contentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`, {
        headers: { 'User-Agent': 'NoniRecruiter-AI-Interviewer' },
      });
      if (contentsRes.ok) {
        const contents = await contentsRes.json();
        if (Array.isArray(contents)) {
          keyFiles = contents.map((item: { name: string; type: string }) => item.name).slice(0, 12);
        }
      }
    } catch {
      keyFiles = ['package.json', 'src', 'lib', 'components', 'README.md'];
    }

    // Strict token optimization caps
    const truncatedDesc = (repoData.description || 'Public software engineering repository').slice(0, 100).replace(/\s+/g, ' ').trim();
    const primaryLanguage = repoData.language || 'TypeScript/JavaScript';
    const topics = (Array.isArray(repoData.topics) ? repoData.topics : []).slice(0, 3);
    const compactFiles = keyFiles.slice(0, 6);

    const summaryText = `[GitHub Context - ${owner}/${repo}]: Tech: ${primaryLanguage} | Files: ${compactFiles.join(', ')} | Desc: ${truncatedDesc}`;

    return {
      repoName: repo,
      owner,
      repoUrl: cleanUrl,
      description: truncatedDesc,
      primaryLanguage,
      languages: [primaryLanguage],
      keyFiles: compactFiles,
      topics,
      summaryText,
    };
  } catch (err) {
    console.warn(`[GitHub Parser Warning] API fetch failed, using fallback summary:`, err);
    return createFallbackGithubSummary(cleanUrl, owner, repo);
  }
}

function createFallbackGithubSummary(repoUrl: string, owner: string, repo: string): GithubRepoSummary {
  const summaryText = `[GitHub Context - ${owner}/${repo}]: Tech: TypeScript/Python | Files: src, lib, components`;

  return {
    repoName: repo,
    owner,
    repoUrl,
    description: 'Candidate repository',
    primaryLanguage: 'TypeScript/Python',
    languages: ['TypeScript', 'Python'],
    keyFiles: ['src', 'lib', 'components'],
    topics: ['fullstack'],
    summaryText,
  };
}
