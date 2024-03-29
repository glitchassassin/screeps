import { buildDismantler } from 'Minions/Builds/dismantler';
import { MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { MissionStatus } from 'Missions/Mission';
import { cachePath, moveTo, unpackPos } from 'screeps-cartographer';
import { findHostileStructures } from 'Selectors/findHostileCreeps';
import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { buildCost } from 'Selectors/minionCostPerTick';
import { roomPlans } from 'Selectors/roomPlans';

export interface ManualSwarmTowerMissionData extends BaseMissionData {
  targetPos: string;
  targetCount?: number;
  assembled?: boolean;
  stagingRoom?: string;
}

export class ManualSwarmTowerMission extends MissionImplementation {
  budget = Budget.EFFICIENCY;
  public creeps = {
    swarm: new MultiCreepSpawner('s', this.missionData.office, {
      role: MinionTypes.DISMANTLER,
      budget: Budget.ESSENTIAL,
      builds: energy => buildDismantler(Math.min(200, energy), 0), // swarm a lot of small blinkies
      count: current => {
        if (
          !this.missionData.assembled &&
          this.missionData.targetCount
        ) {
          // spawn until we have a full wave
          return (this.missionData.targetCount - current.length);
        }
        return 0; // spawned enough for this wave
      }
    })
  };

  priority = 16;
  initialEstimatedCpuOverhead = 0.2;

  constructor(
    public missionData: ManualSwarmTowerMissionData,
    id?: string
  ) {
    super(missionData, id);

    const inRoomDistance = this.path()?.filter(p => p.roomName === this.targetPos().roomName).length ?? 20;

    this.missionData.targetCount = inRoomDistance + (TOWER_HITS / DISMANTLE_POWER)

    this.estimatedEnergyRemaining = this.missionData.targetCount * buildCost([WORK, MOVE], [])
  }
  static fromId(id: ManualSwarmTowerMission['id']) {
    return super.fromId(id) as ManualSwarmTowerMission;
  }

  targetPos() {
    return unpackPos(this.missionData.targetPos);
  }

  path() {
    const origin = roomPlans(this.missionData.office)?.headquarters?.storage.pos;
    if (!origin) return;
    return cachePath(this.id, origin, this.targetPos());
  }

  onStart(): void {
    super.onStart();
    console.log('[ManualSwarmTowerMission] started targeting', this.targetPos())
  }

  run(
    creeps: ResolvedCreeps<ManualSwarmTowerMission>,
    missions: ResolvedMissions<ManualSwarmTowerMission>,
    data: ManualSwarmTowerMissionData
  ) {
    const { swarm } = creeps;

    const flag = Object.values(Game.flags).find(f => f.color === COLOR_RED && f.pos.roomName === this.targetPos().roomName)

    const safemode = Memory.rooms[this.targetPos().roomName]?.safeModeEnds
    if (safemode && safemode - Game.time >= 500) {
      flag?.remove();
      this.status = MissionStatus.DONE;
      return;
    }

    if (!flag) {
      this.status = MissionStatus.DONE;
      swarm.forEach(c => c.suicide());
      return;
    }

    if (swarm.length) console.log('attackers', swarm.length);

    data.stagingRoom ??= this.path()?.reduce((acc, pos) => {
      if (pos.roomName !== this.targetPos().roomName) return pos.roomName;
      return acc;
    }, this.missionData.office) ?? this.missionData.office;

    this.logCpu('overhead');

    if (!data.assembled) {
      if (data.targetCount && swarm.length >= data.targetCount && swarm.every(c => c.pos.roomName === data.stagingRoom)) {
        console.log('swarm assembled targeting', this.targetPos())
        data.assembled = true;
      } else if (data.stagingRoom) {
        // move swarm to staging room
        swarm.forEach(creep => moveTo(creep, { pos: new RoomPosition(25, 25, data.stagingRoom!), range: 20 }));
        this.logCpu('creeps');
        return;
      } else {
        return; // wait for swarm
      }
    } else {
      if (swarm.length === 0) {
        // all creeps dead
        flag?.remove();
        this.status = MissionStatus.DONE;
        return;
      }
    }

    // swarm assembled

    let target: Structure|undefined;
    if (Game.rooms[this.targetPos().roomName]) {
      target = this.targetPos().lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_TOWER);
      target ??= getClosestByRange(this.targetPos(), findHostileStructures(this.targetPos().roomName));
      if (!target) {
        flag?.remove();
        this.status = MissionStatus.DONE; // no more hostile structures
      }
    }

    if (target) {
      console.log('attacking', target, 'hits', target.hits)
    }

    this.logCpu('overhead');

    swarm.forEach(creep => {
      moveTo(creep, { pos: this.targetPos(), range: 1 });
      if (target && creep.pos.inRangeTo(target, 1)) {
        creep.dismantle(target);
      } else {
        const opportunityTarget = creep.pos.findInRange(FIND_HOSTILE_STRUCTURES, 1)[0];
        if (opportunityTarget) {
          creep.dismantle(opportunityTarget);
        }
      }
    })

    this.logCpu('creeps');
  }
}
