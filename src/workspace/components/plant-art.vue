<script setup lang="ts">
withDefaults(defineProps<{ variant?: number }>(), { variant: 1 });
</script>

<template>
  <svg class="plant-art" viewBox="0 0 300 300" fill="none" aria-hidden="true">
    <ellipse
      cx="151"
      cy="272"
      rx="66"
      ry="9"
      fill="currentColor"
      opacity=".08"
    />
    <path
      d="M149 227C154 178 145 102 156 40M150 173L104 117M152 139L202 85M150 202L205 157"
      stroke="#476c46"
      stroke-width="5"
      stroke-linecap="round"
    />
    <g v-if="variant === 2" fill="#2f684d">
      <ellipse
        cx="129"
        cy="66"
        rx="25"
        ry="45"
        transform="rotate(-42 129 66)"
      />
      <ellipse
        cx="188"
        cy="100"
        rx="26"
        ry="44"
        transform="rotate(40 188 100)"
      />
      <ellipse
        cx="116"
        cy="136"
        rx="27"
        ry="44"
        transform="rotate(-47 116 136)"
      />
      <ellipse
        cx="188"
        cy="173"
        rx="27"
        ry="43"
        transform="rotate(49 188 173)"
      />
      <path
        d="M154 68C130 49 140 24 159 13C175 33 172 55 154 68Z"
        fill="#6d8c58"
      />
    </g>
    <g v-else>
      <path
        d="M150 121C100 122 70 79 86 48C110 38 127 53 133 70L131 43C163 51 177 90 150 121Z"
        fill="#346e4a"
      />
      <path
        d="M159 132C161 83 206 58 232 80C237 99 219 112 204 117L228 119C216 148 185 154 159 132Z"
        fill="#518453"
      />
      <path
        d="M144 182C94 190 60 155 70 126C91 112 112 127 119 141L115 116C146 121 165 155 144 182Z"
        fill="#548354"
      />
      <path
        d="M156 202C159 157 200 137 225 156C228 177 213 186 199 189L222 193C206 217 178 222 156 202Z"
        fill="#2e6143"
      />
      <path
        d="M149 116L103 64M162 131L218 91M141 177L84 139M160 200L210 169"
        stroke="#a5be84"
        stroke-width="2"
        opacity=".6"
      />
    </g>
    <path
      d="M111 218H189L180 262C177 275 123 275 120 262L111 218Z"
      :fill="variant === 2 ? '#c09677' : '#e8ddd0'"
    />
    <path
      d="M112 219H188"
      stroke="#aa9378"
      stroke-width="5"
      stroke-linecap="round"
    />
    <path
      d="M127 228L132 260"
      stroke="white"
      stroke-width="4"
      opacity=".35"
      stroke-linecap="round"
    />
  </svg>
</template>
