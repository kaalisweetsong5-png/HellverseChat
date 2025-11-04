#!/bin/bash

echo "🚀 HellverseChat - Easy Deploy Script"
echo "===================================="

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Please run this from the project root."
    exit 1
fi

# Build client
echo "📦 Building client..."
cd server/client/client
npm run build

# Go back to root
cd ../../../

# Add and commit any changes
echo "📝 Committing changes..."
git add .
git commit -m "Production build ready for deployment"

# Push to GitHub (assumes origin remote exists)
echo "⬆️ Pushing to GitHub..."
git push origin main || git push origin master

echo ""
echo "✅ Ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Go to Railway.app or Vercel.com"
echo "2. Import this GitHub repository"
echo "3. Set environment variables:"
echo "   - NODE_ENV=production"
echo "   - JWT_SECRET=your-secure-secret-key"
echo "   - CLIENT_URL=https://your-domain.com"
echo "   - CORS_ORIGIN=https://your-domain.com"
echo ""
echo "🌐 Domain Setup:"
echo "1. Register hellversechat.com at Cloudflare/Namecheap"
echo "2. Point DNS to your hosting service"
echo "3. Enable SSL (automatic with most services)"
echo ""
echo "Happy chatting! 🎉"