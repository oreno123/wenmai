declare module 'splitting' {
  interface SplittingResult {
    chars?: HTMLElement[]
    words?: HTMLElement[]
    [key: string]: unknown
  }
  interface SplittingOptions {
    target?: HTMLElement | HTMLElement[]
    by?: string
    key?: string | null
  }
  function Splitting(options: SplittingOptions): SplittingResult[]
  export default Splitting
}
