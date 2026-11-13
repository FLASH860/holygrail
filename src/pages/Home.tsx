import { About, Hero } from '@/sections/Hero'
import { Watch } from '@/sections/Watch'
import { Cans } from '@/sections/Cans'
import { Sneaker } from '@/sections/Sneaker'

export default function Home() {
  return (
    <>
      <Hero />
      <Watch />
      <Cans />
      <Sneaker />
      <About />
    </>
  )
}
