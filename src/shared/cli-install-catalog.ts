export type CLIInstallPlatform = 'macos' | 'linux' | 'windows'

export type CLIInstallPackageManager =
  | 'brew'
  | 'apt'
  | 'winget'
  | 'npm'
  | 'curl'
  | 'cargo'
  | 'pipx'
  | 'snap'

export interface CLIInstallRecipe {
  packageManager: CLIInstallPackageManager
  label: string
  command: string
}

export interface CLIInstallCatalogEntry {
  executable: string
  title: string
  description: string
  aliases?: string[]
  tags?: string[]
  popular?: boolean
  install: Partial<Record<CLIInstallPlatform, CLIInstallRecipe[]>>
}

export interface InstallableCommandMatch {
  executable: string
  title: string
  description: string
  aliases: string[]
  tags: string[]
  popular: boolean
  installed: boolean
  resolvedExecutable: string | null
  resolvedPath: string | null
  recipes: CLIInstallRecipe[]
}

export const CLI_INSTALL_CATALOG: CLIInstallCatalogEntry[] = [
  {
    executable: 'git',
    title: 'Git',
    description: 'Distributed version control for source code and repositories.',
    tags: ['git', 'vcs', 'version-control'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install git' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install git' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Git.Git' }]
    }
  },
  {
    executable: 'docker',
    title: 'Docker',
    description: 'Build and run containers locally.',
    tags: ['docker', 'containers'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install --cask docker' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install docker.io' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Docker.DockerDesktop' }]
    }
  },
  {
    executable: 'node',
    title: 'Node.js',
    description: 'JavaScript runtime that also provides npm.',
    aliases: ['npm'],
    tags: ['node', 'javascript', 'npm'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install node' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install nodejs npm' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install OpenJS.NodeJS.LTS' }]
    }
  },
  {
    executable: 'pnpm',
    title: 'pnpm',
    description: 'Fast, disk-efficient package manager for Node.js projects.',
    tags: ['node', 'package-manager'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install pnpm' }],
      linux: [
        { packageManager: 'npm', label: 'npm', command: 'npm install -g pnpm' }
      ],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install pnpm.pnpm' }]
    }
  },
  {
    executable: 'yarn',
    title: 'Yarn',
    description: 'Alternative package manager for JavaScript workspaces.',
    tags: ['node', 'package-manager'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install yarn' }],
      linux: [{ packageManager: 'npm', label: 'npm', command: 'npm install -g yarn' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Yarn.Yarn' }]
    }
  },
  {
    executable: 'python',
    title: 'Python',
    description: 'Python runtime and standard tooling.',
    aliases: ['python3', 'pip', 'pip3'],
    tags: ['python', 'runtime'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install python' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install python3 python3-pip' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Python.Python.3' }]
    }
  },
  {
    executable: 'uv',
    title: 'uv',
    description: 'Fast Python package and project manager from Astral.',
    tags: ['python', 'packages'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install uv' }],
      linux: [{ packageManager: 'curl', label: 'install script', command: 'curl -LsSf https://astral.sh/uv/install.sh | sh' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install astral-sh.uv' }]
    }
  },
  {
    executable: 'poetry',
    title: 'Poetry',
    description: 'Python dependency and packaging manager.',
    tags: ['python', 'packages'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install poetry' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install poetry' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Python.Poetry' }]
    }
  },
  {
    executable: 'gh',
    title: 'GitHub CLI',
    description: 'Work with GitHub repos, issues, and PRs from the terminal.',
    tags: ['github', 'git'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install gh' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install gh' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install GitHub.cli' }]
    }
  },
  {
    executable: 'kubectl',
    title: 'kubectl',
    description: 'Manage Kubernetes clusters from the command line.',
    tags: ['kubernetes', 'containers'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install kubectl' }],
      linux: [{ packageManager: 'snap', label: 'snap', command: 'sudo snap install kubectl --classic' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Kubernetes.kubectl' }]
    }
  },
  {
    executable: 'terraform',
    title: 'Terraform',
    description: 'Infrastructure as code for cloud and local resources.',
    tags: ['iac', 'cloud'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew tap hashicorp/tap && brew install hashicorp/tap/terraform' }],
      linux: [{ packageManager: 'snap', label: 'snap', command: 'sudo snap install terraform --classic' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Hashicorp.Terraform' }]
    }
  },
  {
    executable: 'jq',
    title: 'jq',
    description: 'Filter, transform, and inspect JSON from the terminal.',
    tags: ['json', 'data'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install jq' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install jq' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install jqlang.jq' }]
    }
  },
  {
    executable: 'rg',
    title: 'ripgrep',
    description: 'Fast recursive text search for code and project files.',
    aliases: ['ripgrep'],
    tags: ['search', 'text'],
    popular: true,
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install ripgrep' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install ripgrep' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install BurntSushi.ripgrep.MSVC' }]
    }
  },
  {
    executable: 'fzf',
    title: 'fzf',
    description: 'Fuzzy finder for files, history, and shell workflows.',
    tags: ['search', 'fuzzy'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install fzf' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install fzf' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install junegunn.fzf' }]
    }
  },
  {
    executable: 'bun',
    title: 'Bun',
    description: 'Fast JavaScript runtime and package manager.',
    tags: ['node', 'javascript'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install oven-sh/bun/bun' }],
      linux: [{ packageManager: 'curl', label: 'install script', command: 'curl -fsSL https://bun.sh/install | bash' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Oven-sh.Bun' }]
    }
  },
  {
    executable: 'go',
    title: 'Go',
    description: 'Go compiler and toolchain.',
    tags: ['golang', 'runtime'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install go' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install golang' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install GoLang.Go' }]
    }
  },
  {
    executable: 'cargo',
    title: 'Cargo',
    description: 'Rust package manager and build tool.',
    aliases: ['rustc', 'rustup'],
    tags: ['rust', 'build'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install rustup-init && rustup-init -y' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install cargo rustc' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install Rustlang.Rustup' }]
    }
  },
  {
    executable: 'php',
    title: 'PHP',
    description: 'PHP runtime and CLI for web and scripting workloads.',
    tags: ['php', 'runtime'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install php' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install php' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install PHP.PHP' }]
    }
  },
  {
    executable: 'ruby',
    title: 'Ruby',
    description: 'Ruby runtime and standard CLI tooling.',
    tags: ['ruby', 'runtime'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install ruby' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install ruby-full' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install RubyInstallerTeam.RubyWithDevKit.3.4' }]
    }
  },
  {
    executable: 'java',
    title: 'Java',
    description: 'Java runtime and CLI tooling.',
    tags: ['java', 'runtime'],
    install: {
      macos: [{ packageManager: 'brew', label: 'Homebrew', command: 'brew install openjdk' }],
      linux: [{ packageManager: 'apt', label: 'apt', command: 'sudo apt install default-jre' }],
      windows: [{ packageManager: 'winget', label: 'winget', command: 'winget install EclipseAdoptium.Temurin.21.JRE' }]
    }
  }
]

export function normalizeCLIInstallPlatform(platformLike: string): CLIInstallPlatform {
  const normalized = platformLike.trim().toLowerCase()
  if (normalized.includes('win')) return 'windows'
  if (normalized.includes('darwin') || normalized.includes('mac')) return 'macos'
  return 'linux'
}

export function getInstallRecipesForPlatform(
  entry: CLIInstallCatalogEntry,
  platform: CLIInstallPlatform
): CLIInstallRecipe[] {
  return entry.install[platform] ?? []
}

export function getPrimaryInstallRecipe(
  entry: CLIInstallCatalogEntry,
  platform: CLIInstallPlatform
): CLIInstallRecipe | null {
  return getInstallRecipesForPlatform(entry, platform)[0] ?? null
}

export function findCLIInstallCatalogEntry(query: string): CLIInstallCatalogEntry | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return null

  return (
    CLI_INSTALL_CATALOG.find(
      (entry) =>
        entry.executable.toLowerCase() === normalized ||
        entry.aliases?.some((alias) => alias.toLowerCase() === normalized)
    ) ?? null
  )
}

function buildSearchTerms(entry: CLIInstallCatalogEntry): string[] {
  return [
    entry.executable,
    entry.title,
    ...(entry.aliases ?? []),
    ...(entry.tags ?? []),
    entry.description
  ]
}

function scoreCatalogEntry(entry: CLIInstallCatalogEntry, query: string): number {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return entry.popular ? 100 : 0
  }

  const executable = entry.executable.toLowerCase()
  if (executable === normalized) return 1000
  if (entry.aliases?.some((alias) => alias.toLowerCase() === normalized)) return 950
  if (executable.startsWith(normalized)) return 800
  if (entry.aliases?.some((alias) => alias.toLowerCase().startsWith(normalized))) return 760
  if (entry.title.toLowerCase().includes(normalized)) return 640

  const searchTerms = buildSearchTerms(entry).map((term) => term.toLowerCase())
  const matchingTerm = searchTerms.find((term) => term.includes(normalized))
  if (matchingTerm) {
    return 480 - Math.min(matchingTerm.indexOf(normalized), 120)
  }

  return -1
}

export function searchCLIInstallCatalog(
  query: string,
  platform: CLIInstallPlatform,
  limit = 12
): CLIInstallCatalogEntry[] {
  const entries = CLI_INSTALL_CATALOG.filter((entry) => getInstallRecipesForPlatform(entry, platform).length > 0)
  const normalized = query.trim().toLowerCase()

  return entries
    .map((entry) => ({ entry, score: scoreCatalogEntry(entry, normalized) }))
    .filter(({ score, entry }) => (normalized ? score >= 0 : entry.popular))
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score
      return left.entry.executable.localeCompare(right.entry.executable)
    })
    .slice(0, limit)
    .map(({ entry }) => entry)
}
