<script lang="ts">
	import { T } from '@threlte/core'
	import { Edges, Text, useTexture } from '@threlte/extras'
	import { onDestroy } from 'svelte'
	import { Tween } from 'svelte/motion'
	import { DEG2RAD } from 'three/src/math/MathUtils.js'
	// import type { ArcadeAudio } from '../sound'
	import { useTimeout } from '$components/hooks/useTimeout'
	import { game } from '$game/Game.svelte'
	import ThrelteLogo from '$game/objects/ThrelteLogo.svelte'

	const { timeout } = useTimeout()
	const texture = useTexture('/images/invadersLogo.jpeg')
	// let audio: ArcadeAudio | undefined = undefined
	let direction = $state<1 | -1>(1)

	const logoScale = new Tween(0)

	const showLogoAfter = 2e3
	const showThrelteAfter = showLogoAfter + 1e3
	const showPressSpaceToStartAfter = showThrelteAfter + 2e3

	timeout(() => {
		audio = game.sound.play('levelSlow', {
			loop: true,
			volume: 1
		})
		logoScale.set(1)
		game.state = 'await-intro-skip'
	}, showLogoAfter)

	const textScale = new Tween(0)
	const textRotation = new Tween(10)
	timeout(() => {
		textScale.set(1)
		textRotation.set(0)
	}, showThrelteAfter)

	let showPressSpaceToStart = $state(false)
	let blinkClock: 0 | 1 = $state(0)

	timeout(() => {
		showPressSpaceToStart = true
	}, showPressSpaceToStartAfter)

	let intervalHandler = setInterval(() => {
		if (!showPressSpaceToStart) return
		blinkClock = blinkClock ? 0 : 1
	}, 500)
	onDestroy(() => {
		clearInterval(intervalHandler)
	})

	const onkeydown = (e: KeyboardEvent) => {
		if (e.key === 'ArrowLeft') {
			direction = -1
		} else if (e.key === 'ArrowRight') {
			direction = 1
		}
	}

	onDestroy(() => {
		audio?.source.stop()
	})
</script>

<svelte:window {onkeydown} />

<T.Group position.z={-0.35}>
	<!-- <ThrelteLogo positionZ={-1.2} scale={logoScale.current} {direction} /> -->

	<T.Group
		scale={textScale.current}
		position.z={1.3}
		rotation.x={-90 * DEG2RAD}
		rotation.z={textRotation.current}
	>
		{#await texture then map}
			<T.Mesh position.y={1.5}>
				<T.PlaneGeometry args={[11.3, 9.8]} />
				<T.MeshBasicMaterial {map} transparent opacity={1} />
				<!-- <Edges color={game.baseColor} /> -->
			</T.Mesh>
		{/await}
	</T.Group>
</T.Group>

{#if showPressSpaceToStart}
	<T.Group
		scale={textScale.current}
		position.z={3.3}
		rotation.x={-90 * DEG2RAD}
		visible={!!blinkClock}
	>
		<Text
			font="/fonts/beefd.ttf"
			anchorX="50%"
			anchorY="50%"
			textAlign="center"
			fontSize={0.35}
			color={game.baseColor}
			text={`PRESS SPACE TO START`}
		/>
	</T.Group>
{/if}
