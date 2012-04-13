Evaluating capability of non-temporal axis representations of Ngram data
========================================================================

**Project 1:**

  We will be creating an interactive visualization that allows users to see
  many words in a single frame.  The goal is to see if we can create a
  scatter-plot visualization without an explicit temporal axis that rivals
  traditional temporal axis based visualizations for identifying interesting
  words and exploring word histories.

  We will attempt to address issues of scale - allowing users to find
  "interesting" words and/or inter-word relationships from a very large
  dataset.  A web based solution in particular will have bandwidth
  restrictions (implicit and explicit). We will explore creative way(s) for
  allowing users to (interactively) define what makes words "interesting"

**Project 2:**

   We intend to continue development of the visualization started in project 1.
   We will attempt to make our visualization useful (the goal) as opposed to
   simply functional (the current state).  We would make the design more
   deliberate and consider things like: a good/better way to navigate through
   time; better placement of sliders , labels and more; more useful metrics for
   the DOI score sliders; more effective use of visual encodings (e.g. color);
   etc.

Goals
-----

**Project 1:**

  * Learn about web-based design challenges (e.g. client/server interaction,
    bandwidth limitations, etc.)

  * Learn how to program in javascript.

  * Learn how to use the D3 graphics tookit

  * See how good (or not) our Ngram Design Challenge designs are.

  * Explore the Ngram data more, and perhaps find interesting words and
    relationships.

**Project 2:**

  Items in priority order:

    #. Design and implement an intelligent and more aesthetic layout for the
       visualization.  Intelligent labeling of sliders, axes, etc. will be
       added.

    #. More practical time navigation.  Likely a slider.

    #. Use color and size to represent different things rather than redundant
       encoding of the DOI score.

    #. Select and implement more useful metrics for the DOI scoring.  Metrics that
       give a feel for a word's time history are highly desirable.  Possible metrics:

      - a word's "proximity" to its all time maximum or minimum count

      - a word's rate of change of count

      - age of a word (how long ago did it broke some threshold)

  Optional (time permitting):

    * some sort of zoom functionality.

    * ability for user to select positional (axis) encodings.

    * appropriate count normalizations.

Milestones
----------

**Project 1:**

  * Week 2 (March 9) - We will have completed a simple, web-based visualization 
    with D3 using a dummy dataset and featuring little interactivity.

  * Week 3 (March 16) - We will have incorporated the Google dataset and will 
    have a plan for addressing the scaling issue.

  * Week 4 (March 23) - We will have designed and mostly implemented some level 
    of interactivity.

  * Week 5 (March 30) - Have completed the tool, as well as a write-up about the 
    process/result.

**Project 2:**

  * Week 2 (April 21) - priority item 1 (from the Goals_ section) completed

  * Week 3 (April 28) - priority items 2 and 3 completed

  * Week 4 (May 5) - priority item 4 completed

  * Week 5 (May 12) - (optional items time permitting) and writeup completed.

Outcomes/Deliverables
---------------------

**Project 1:**

  * web-based implementation of visualization for ngrams data

    - likely will be a hybrid of ideas from our Design Challenge designs

    - will have interactive features.

  * Some sort of assessment of the "goodness" of our design with respect to
    more traditional designs.  Perhaps qualitative, perhaps empirical.
    
  * A 2-4 page paper outlining and evaluating our implementation and its design, 
    as well as documenting the process.

**Project 2:**

  * Our deliverable will be an upgraded version of our visualization from
    project 1, tailored to achieve the goals listed above.

  * We will also submit a 2-4 page paper describing the design and implementation
    process, as well as an evaluation of the tool's usefulness.


Resources
---------

* Google n-grams dataset (1-grams only)

* D3 javascript toolkit

* Design Challenge designs

  - Eric's page density scatter plot
  - Robert's word collage

* Visual Thinking for Design by Colin Ware


Evaluation Plan
---------------

**Project 1:**

  The main thing we will judge ourselves on will be the efficiency and usefulness 
  of web-based scaling approach. Our goal is to have a tool that loads quickly on 
  a web-browser and allows the user to dynamically interact with the (very) large 
  dataset. Another evaluation criteria will be the usefulness of our actual design, 
  and whether or not it highlights interesting words or relationships between words. 
  However, this criteria is secondary.

**Project 2:**

  Whereas our evaluation criteria for the first project were mainly based on creating
  a functional prototype, for this project we will take a more critical look at our
  design based on the principles that we have learned in this class. We hope to have
  a tool that exposes interesting characteristics of and/or relationships between the
  data. We will also judge our success based on the amount that the interactive
  functions and DOI function allow users to customize the view to find insights
  relevant to their particular interests.

Initial Reading
----------------

* d3 api documentation (https://github.com/mbostock/d3/wiki)

* Go api documentation (http://weekly.golang.org)

* Visual Thinking for Design (Ware) Ch. 8 (Creative Meta-seeing)


Initial Progress
----------------

3/9/2012 Update
+++++++++++++++

Screenshot of progress `here <https://plus.google.com/photos/110223354232123272707/albums/5717258253797892417?authkey=CKfEyL2uk-31zwE>`_.

* created a rudimentary semi-interative dummy visualization.

  * uses client-server paradigm

  * web-based using d3 toolset

  * renders small subset of google ngram data (few hundred words)

* challenges:

  * Addressing issues of scale will be more challenging than we initially
    supposed.  Traversing (and doing simple calcs on) the ngram dataset (millions
    of words) takes on the order of hours for things as simple as determining the
    X most common words.  We will likely have to limit our visualization word
    pool to a pre-chosen set of on the order of 10000 words.
  
  * Javascript rendering can satisfactorily handle circa a few thousand words
    tops.  This could potentially be addressed by having serverside processing
    that only sends


