import { useState } from 'react'
import './App.css'
import { NavLink } from 'react-router'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">

        <NavLink to="/messages">Open messages</NavLink>
      </p>
    </>
  )
}

export default App
