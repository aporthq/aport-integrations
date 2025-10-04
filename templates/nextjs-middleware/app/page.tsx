export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            APort Next.js Middleware Example
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            A complete Next.js application with APort middleware integration, ready for instant deployment to Vercel.
          </p>
          
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-8">
            <strong>Deployed Successfully!</strong> Your APort middleware is now running on Vercel.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Refunds</h3>
            <p className="text-gray-600 mb-4">
              Process refunds with agent verification and amount limits.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono">
              POST /api/payments/refund
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Money Transfers</h3>
            <p className="text-gray-600 mb-4">
              Transfer funds between accounts with policy enforcement.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono">
              POST /api/payments/transfer
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Admin Dashboard</h3>
            <p className="text-gray-600 mb-4">
              Access admin features with enhanced verification.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono">
              GET /api/admin/dashboard
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Start Guide</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Test the Health Check</h3>
              <p className="text-gray-600 mb-3">Verify your deployment is working:</p>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                curl {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/public/health
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Test Protected Endpoints</h3>
              <p className="text-gray-600 mb-3">Try accessing protected routes (should require agent ID):</p>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                curl -X GET {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/admin/dashboard
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Test with Agent ID</h3>
              <p className="text-gray-600 mb-3">Include agent ID in header for successful verification:</p>
              <div className="bg-gray-100 p-3 rounded text-sm font-mono">
                curl -X GET -H "X-Agent-ID: test-agent-123" {typeof window !== 'undefined' ? window.location.origin : 'https://your-app.vercel.app'}/api/admin/dashboard
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">🔧 Configuration</h3>
          <p className="text-blue-800 mb-4">
            To connect to the real APort API, add your API key to the environment variables in Vercel:
          </p>
          <div className="bg-blue-100 p-3 rounded text-sm font-mono">
            APORT_API_KEY=your_actual_api_key_here
          </div>
          <p className="text-blue-700 text-sm mt-2">
            Without this, the app uses a mock client for demonstration purposes.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Built with ❤️ using <a href="https://nextjs.org" className="text-blue-600 hover:text-blue-800">Next.js</a> and{' '}
            <a href="https://aport.io" className="text-blue-600 hover:text-blue-800">APort</a>
          </p>
        </div>
      </div>
    </div>
  );
}
