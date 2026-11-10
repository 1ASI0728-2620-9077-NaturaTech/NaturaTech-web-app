import { useAuthenticationStore } from "@/iam/services/authentication.store";
import { ProfileApiService } from "@/profile-management/services/profile-api.service";
import { PlantService } from "@/plant-management/services/plant-api.service";
import { TaskApiService } from "@/task-management/services/task-api.service";
import type { Task } from "@/task-management/model/task.entity";

/** No global directory requests for personal views. Server authorization remains mandatory. */
export async function loadPersonalPlants() {
  const auth = useAuthenticationStore();
  if (!auth.userId) throw new Error("Session required");
  const profile = await new ProfileApiService().getByUserId(auth.userId);
  const plants = await PlantService.getByProfile(profile.id);
  if (plants.some((plant) => plant.profileId !== profile.id))
    throw new Error("Unexpected plant owner");
  return {
    profile,
    plants,
    user: { id: auth.userId, email: auth.email, roles: ["ROLE_USER"] },
  };
}

export async function loadPersonalTasks() {
  const context = await loadPersonalPlants();
  const tasks = new Map<number, Task>();
  const service = new TaskApiService();
  // Bounded batches to avoid one unbounded request per plant.
  for (let index = 0; index < context.plants.length; index += 4) {
    const batches = await Promise.all(
      context.plants.slice(index, index + 4).map(async (plant) => {
        const result = await service.getAll(plant.id);
        if (
          result.some(
            (task) =>
              task.profileId !== context.profile.id ||
              task.plantId !== plant.id,
          )
        )
          throw new Error("Unexpected task owner");
        return result;
      }),
    );
    batches.flat().forEach((task) => tasks.set(task.id, task));
  }
  return { ...context, tasks: [...tasks.values()] };
}
