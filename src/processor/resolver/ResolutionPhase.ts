/**
 * ResolutionPhase - Explicit enumeration of the token resolution phases
 *
 * This enum makes the resolution flow more transparent and maintainable,
 * allowing each phase to be clearly identified and debugged.
 */
export enum ResolutionPhase {
  PARSE_AND_BUILD_GRAPH = "parse_and_build_graph",
  MAP_PREFIX_DEPENDENCIES = "map_prefix_dependencies",
  RELEASE_EARLY_RESOLVED = "release_early_resolved",
  RESOLVE_DEPENDENCY_FREE = "resolve_dependency_free",
  FINALIZE = "finalize",
}
