// Simple demo data seeder - runs in popup
async function seedDemoData() {
  const demoScans = [
    {
      imageUrl: 'https://picsum.photos/seed/ai1/400/400',
      result: 'ai',
      confidence: 95.5,
      timestamp: Date.now() - 3600000, // 1 hour ago
      pageUrl: 'https://example.com'
    },
    {
      imageUrl: 'https://picsum.photos/seed/real1/400/400',
      result: 'human',
      confidence: 12.3,
      timestamp: Date.now() - 7200000, // 2 hours ago
      pageUrl: 'https://example.com'
    },
    {
      imageUrl: 'https://picsum.photos/seed/ai2/400/400',
      result: 'ai',
      confidence: 76.8,
      timestamp: Date.now() - 86400000, // 1 day ago
      pageUrl: 'https://example.com'
    },
    {
      imageUrl: 'https://picsum.photos/seed/real2/400/400',
      result: 'human',
      confidence: 8.9,
      timestamp: Date.now() - 172800000, // 2 days ago
      pageUrl: 'https://example.com'
    },
    {
      imageUrl: 'https://picsum.photos/seed/ai3/400/400',
      result: 'ai',
      confidence: 88.2,
      timestamp: Date.now() - 259200000, // 3 days ago
      pageUrl: 'https://example.com'
    }
  ];
  
  await chrome.storage.local.set({ scanHistory: demoScans });
  console.log('✅ Demo data seeded!');
  return demoScans.length;
}

// Call this function to seed demo data
if (typeof window !== 'undefined') {
  window.seedDemoData = seedDemoData;
}
