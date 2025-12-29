<template>
  <div class="outer-wrap">
    <header class="page-nav">
      <button
        class="page-tab"
        :class="{ active: activePage === 'force' }"
        @click="activePage = 'force'"
      >
        Force Profile
      </button>
      <button
        class="page-tab"
        :class="{ active: activePage === 'pressure' }"
        @click="activePage = 'pressure'"
      >
        Lever Pressure Profile Replicator
      </button>
    </header>
    <ForceProfileDesigner v-if="activePage === 'force'" />
    <PressureProfileDesigner v-else />
  </div>
</template>

<script setup>
import { ref } from "vue";
import ForceProfileDesigner from "./components/ForceProfileDesigner.vue";
import PressureProfileDesigner from "./components/PressureProfileDesigner.vue";

const activePage = ref("force");
</script>
