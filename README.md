# Real Estate Web Application

A modern web application for a real estate company specializing in commercial land, plots, and farms in Potchefstroom, Klerksdorp, and surrounding areas.

## Features

- Modern, responsive UI built with Next.js and Tailwind CSS
- User authentication with Supabase
- Property listings with search and filter functionality
- Role-based access control (Admin, Agent, User)
- Contact form for inquiries
- Property management dashboard for agents

## Tech Stack

- **Frontend:** Next.js 14 with TypeScript
- **Styling:** Tailwind CSS
- **Backend & Database:** Supabase
- **Authentication:** Supabase Auth
- **Hosting:** Vercel (Frontend) + Supabase (Backend)

## Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Supabase account

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd real-estate-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
real-estate-app/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # Reusable components
│   ├── lib/                 # Utility functions and configurations
│   └── types/              # TypeScript type definitions
├── public/                  # Static files
└── package.json            # Project dependencies and scripts
```

## Development

- Run development server: `npm run dev`
- Build for production: `npm run build`
- Start production server: `npm start`
- Run linter: `npm run lint`

## Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel
4. Deploy!

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
