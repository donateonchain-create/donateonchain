import { useMountEffect } from '../hooks/useMountEffect'

const ScrollToTop = () => {
    useMountEffect(() => {
        window.scrollTo(0, 0)
    })

    return null
}

export default ScrollToTop
