// Following async-suspense-boundaries: Loading skeleton shown while page streams
export default function ExplorerLoading() {
  return (
    <div className="bg-linear-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center" style={{ minHeight: '100vh' }}>
      <div className="text-center">
        <div className="w-16 h-16 bg-linear-to-br from-orange-300 to-purple-400 rounded-full mx-auto animate-pulse shadow-2xl mb-4" />
        <p className="text-white text-lg">Loading your universe...</p>
      </div>
    </div>
  );
}
