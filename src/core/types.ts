export type SupportedNetwork = 'mastodon' | 'bluesky';

export type OutputFormat = 'png' | 'jpg' | 'webp';

export type AspectRatioPreset = '1:1' | '4:5' | '16:9' | '9:16' | '3:2';

export type BackgroundType = 'solid' | 'gradient';

export interface MediaAttachment {
  type: 'image' | 'gifv' | 'video' | 'audio' | 'unknown';
  url: string;
  previewUrl?: string;
  description?: string;
}

export interface SocialMetrics {
  repliesCount?: number;
  reblogsCount?: number;
  favouritesCount?: number;
  bookmarksCount?: number;
}

export interface LinkCard {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
}

export interface SocialAuthor {
  displayName: string;
  handle: string;
  profileUrl?: string;
  avatarUrl?: string;
}

export interface SocialPostData {
  network: SupportedNetwork;
  url: string;
  id: string;
  contentHtml: string;
  contentText: string;
  createdAt: string;
  language?: string;
  sensitive?: boolean;
  spoilerText?: string;
  author: SocialAuthor;
  media: MediaAttachment[];
  metrics: SocialMetrics;
  card?: LinkCard;
}

export interface ThemeBackground {
  type: BackgroundType;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
}

export interface ThemeFonts {
  body: string;
  heading: string;
  monospace: string;
}

export interface ThemeConfig {
  name: string;
  themeDirectory: string;
  templatePath: string;
  stylesheetPath: string;
  assetsDirectory?: string;
  postClassName: string;
  bodyClassName: string;
  background: ThemeBackground;
  fonts: ThemeFonts;
  variables: Record<string, string>;
}

export interface RenderConfig {
  url: string;
  network: SupportedNetwork;
  outputPath: string;
  outputFormat: OutputFormat;
  width: number;
  height: number;
  aspectRatio?: AspectRatioPreset;
  themeName: string;
  backgroundOverride?: string;
  embedAltText: boolean;
  generateAltTextFile: boolean;
  debugHtml: boolean;
  debugData: boolean;
  dryRun: boolean;
}

export interface AppConfigFile {
  themeName?: string;
  outputFormat?: OutputFormat;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatioPreset;
  network?: SupportedNetwork;
  backgroundOverride?: string;
  embedAltText?: boolean;
  generateAltTextFile?: boolean;
  debugHtml?: boolean;
  debugData?: boolean;
  dryRun?: boolean;
  themeRoot?: string;
  outputDirectory?: string;
}

export interface SocialNetworkAdapter {
  readonly network: SupportedNetwork;
  detect(url: string): boolean;
  fetchPost(url: string): Promise<SocialPostData>;
}

export interface TemplateRenderData {
  config: RenderConfig;
  post: SocialPostData;
  nowIso: string;
  backgroundCss: string;
  inlineCss: string;
  themeFontCss: string;
  themeVariableCss: string;
}
