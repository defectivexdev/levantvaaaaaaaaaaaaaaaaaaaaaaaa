const liveries = [
    { aircraft: 'A320', name: 'Levant A320 Classic', simulator: 'MSFS', downloads: 245 },
    { aircraft: 'A321', name: 'Levant A321 Modern', simulator: 'MSFS', downloads: 189 },
    { aircraft: 'B737', name: 'Levant 737-800', simulator: 'X-Plane', downloads: 156 },
    { aircraft: 'B777', name: 'Levant 777-300ER', simulator: 'MSFS', downloads: 312 },
];

export default function LiveryPage() {
    return (
        <div className="space-y-6">
            <div className="glass-card p-6">
                <h1 className="text-2xl font-bold text-white mb-2">Aircraft Liveries</h1>
                <p className="text-gray-400">Download official Levant Virtual liveries for your simulator</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {liveries.map((livery) => (
                    <div key={livery.name} className="glass-card overflow-hidden">
                        <div className="h-40 bg-gradient-to-br from-dark-700 to-dark-600 flex items-center justify-center">
                            <span className="text-6xl">✈️</span>
                        </div>
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-accent-gold font-mono">{livery.aircraft}</span>
                                <span className="text-gray-500 text-sm">{livery.simulator}</span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-4">{livery.name}</h3>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">{livery.downloads} downloads</span>
                                <button className="btn-primary text-sm py-2 px-4">Download</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
