# 1. Create new Next.js project with TypeScript
cd ~/Documents/github/amtbcf
npx create-next-app@latest booksite --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
# 2. Navigate into project directory
cd booksite
# 3. Install required dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install @radix-ui/react-icons
npm install lucide-react
npm install @hookform/resolvers react-hook-form zod
npm install clsx tailwind-merge
npm install @radix-ui/react-slot
npm install next-themes
npm install sentry/nextjs
# 4. Install shadcn/ui CLI
npm install shadcn-ui@latest
# 5. Initialize shadcn/ui
npx shadcn-ui@latest init
# When prompted during shadcn-ui initialization:
# - Style: Default
# - Base color: Slate
# - CSS variables: Yes
# - Tailwind CSS class prefix: ""
# - Components directory: @/components
# - Utility directory: @/lib/utils
# - Include example components: No
# 6. Install commonly needed shadcn/ui components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add form
npx shadcn-ui@latest add input
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
# 7. Create essential directories
mkdir -p src/app/api
mkdir -p src/lib/supabase
mkdir -p src/components/books
mkdir -p src/components/auth
mkdir -p src/components/layout
mkdir -p src/types
mkdir -p src/hooks
mkdir -p public/images
# 8. Initialize Git (if not already initialized by create-next-app)
git init
git branch -M main
# 9. Create .env.local file
cat > .env.local << EOL
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_api_key
EOL
# 10. Create .gitignore if not exists
cat > .gitignore << EOL
# dependencies
/node_modules
/.pnp
.pnp.js
# testing
/coverage
# next.js
/.next/
/out/
# production
/build
# misc
.DS_Store
.pem
# debug
npm-debug.log
yarn-debug.log*
yarn-error.log*
# local env files
.env*.local
# vercel
.vercel
# typescript
*.tsbuildinfo
next-env.d.ts
EOL
# 11. Start the development server
npm run dev