import { useEffect, useState } from "react"
import "./App.css"

function App() {
    const [health, setHealth] = useState<{
        ok: boolean
        timestamp: string
    } | null>(null)

    useEffect(() => {
        fetch("/health.json")
            .then((res) => res.json())
            .then((data) => setHealth(data))
            .catch(() =>
                setHealth({ ok: false, timestamp: new Date().toISOString() })
            )
    }, [])

    return (
        <main className="demo">
            <div className="card">
                <h1>Infrastack Demo</h1>
                <p>
                    This Vite + React app is running inside a container deployed
                    by <strong>Infrastack</strong>.
                </p>
                <div className="status">
                    <span>Health check:</span>
                    {health ? (
                        <span className={health.ok ? "ok" : "error"}>
                            {health.ok ? "✅ Healthy" : "❌ Unhealthy"} at{" "}
                            {new Date(health.timestamp).toLocaleTimeString()}
                        </span>
                    ) : (
                        <span className="loading">Loading…</span>
                    )}
                </div>
                <footer>
                    <a
                        href="https://github.com/linuskang/infrastack"
                        target="_blank"
                        rel="noreferrer"
                    >
                        View source on GitHub
                    </a>
                </footer>
            </div>
        </main>
    )
}

export default App
