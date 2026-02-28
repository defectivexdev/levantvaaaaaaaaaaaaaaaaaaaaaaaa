export interface GitHubRelease {
  tag_name: string;
  published_at: string;
  html_url: string;
  assets: {
    browser_download_url: string;
    name: string;
    size: number;
    download_count: number;
  }[];
}
