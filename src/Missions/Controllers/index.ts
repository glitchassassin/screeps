import AcquireDispatcher from './Acquire';
import DefenseDispatcher from './Defense';
import EngineerDispatcher from './Engineer';
import ExploreDispatcher from './Explore';
import HarvestDispatcher from './Harvest';
import HeadquartersDispatcher from './Headquarters';
import LogisticsDispatcher from './Logistics';
import MineDispatcher from './Mine';
import PlunderDispatcher from './Plunder';
import RefillDispatcher from './Refill';
import ScienceDispatcher from './Science';
import SquadMissionsDispatcher from './SquadMissions';
import UpgradeDispatcher from './Upgrade';

export const Dispatchers = [
  HarvestDispatcher,
  LogisticsDispatcher,
  ExploreDispatcher,
  EngineerDispatcher,
  RefillDispatcher,
  UpgradeDispatcher,
  HeadquartersDispatcher,
  MineDispatcher,
  ScienceDispatcher,
  AcquireDispatcher,
  DefenseDispatcher,
  PlunderDispatcher,
  SquadMissionsDispatcher // should always be last
];
