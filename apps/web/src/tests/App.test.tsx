import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from '../App'

describe('App component', () => {
    it('renders without crashing', () => {
        render(<App />)
        // Basic test to ensure context providers and router wrappers do not immediately crash.
        expect(screen).toBeDefined()
    })
})
