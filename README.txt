TODO:
    - SQL
        - NOT IN
        - NOT LIKE
        - NOT other uses?
        - IS (is null, is not null, what else)
        - ANY, SOME (subquery)
        - comments?
        - support proper data types (select 0 + id should be number addition)
        - support over_clause for aggregates
        - support union
    - General
        - detect data types and use them right (e.g. order by id desc - id is a number, and sorting should respect numbers)
        - support browser mode and probably some other ways of io
        - support charcodes other than UTF8 
- Unsupported (and not planned)
    - partitions
    - transactions
    - nested joins
    - indexes
- Naturally not supported


BUGS
