import type { Config } from 'release-it';

export default {
  "git": {
    "push": true,
    "tag": true,
    "requireCleanWorkingDir": true,
    "commitMessage": "chore(release): v${version}"
  },
  "npm": {
    "publish": false
  },
  "github": {
    "release": true
  },
  "hooks": {
    "before:init": "npm run check && npm run build"
  }
} satisfies Config;
