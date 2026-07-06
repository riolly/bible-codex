import { Redirect } from 'expo-router';

import { CarouselLab } from '@/lab/carousel/carousel-lab';

// Lab route (ADR-0018 "preset lab" pattern, first instance — #47): dev-only
// screens for on-device tuning/spikes live under /lab and render ONLY in
// __DEV__; a release build redirects home. Screens themselves live in
// src/lab/ — src/app/ holds just the route shell.
export default function CarouselLabRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <CarouselLab />;
}
